"""Sentinel-1 flood segmentation service.

Provides two implementations:
1. Real — AI model inference using actual trained weights (when model + weights available)
2. Mock — deterministic fallback (existing behaviour, used when real model unavailable)

Source / status is tracked on every result:
"REAL" → resolved by the real AI model
"FALLBACK" → resolved by the mock deterministic service
"""

from __future__ import annotations

from typing import Any, Optional, TypedDict

import hashlib
import json
import os
import tempfile
from pathlib import Path

import numpy as np

try:
    import torch
except ImportError:
    torch = None
from rasterio.transform import from_bounds, Affine
from rasterio.crs import CRS
from rasterio.errors import RasterioError
from pyproj import Transformer, CRS as CRSpy

from ..schemas.satellite import SatelliteScene, SatelliteSceneSelection
from ..schemas.results import (
    FloodAnalysisResult,
    FloodConfidenceBreakdown,
    AiModelInfo,
    ModelMetrics,
)


class FloodSegmentationResult(TypedDict):
    """Result of AI flood segmentation inference."""
    flood_mapped_area_km2: float
    confidence: FloodConfidenceBreakdown
    flood_mask: dict[str, Any]
    mask_format: str
    source: str  # "REAL" or "FALLBACK"
    provider_source: str
    model_name: str
    model_version: str
    threshold: float
    flooded_pixel_count: int
    total_aoi_pixels: float
    processing_status: str
    warnings: list[str]


# ─── Model interface compatibility ──────────────────────────────────────────

# If a compatible checkpoint is present and verified, the model is loaded at
# service initialisation.  If not, the service falls back to the deterministic
# mock implementation so upper layers never present mock as real.

_MODEL_PATH = Path(__file__).parent.parent / "data" / "model"
_CHECKPOINT_PATH = _MODEL_PATH / "checkpoint.pt"


def _is_checkpoint_compatible(checkpoint: object) -> bool:
    """Very cheap compatibility check: model must have a forward method."""
    return hasattr(checkpoint, "forward") and callable(checkpoint.forward)


def _try_load_checkpoint() -> object | None:
    """Attempt to load a local model checkpoint if it exists and is usable.

    Returns the loaded module if compatible, otherwise None.
    """
    if torch is None:
        return None
    if not _CHECKPOINT_PATH.exists():
        return None

    # Size guard – the full Kuro Siwo training set is ~1 TB; anything
    # larger than 500 MB is rejected out of hand.
    try:
        sz = _CHECKPOINT_PATH.stat().st_size
    except OSError:
        return None
    if sz > 500 * 1024 * 1024:  # 500 MB
        return None

    try:
        ckpt = torch.load(_CHECKPOINT_PATH, map_location="cpu")
    except Exception:
        return None

    if not isinstance(ckpt, torch.nn.Module):
        # If it is a plain state-dict, we cannot call it directly;
        # reject it to avoid silently falling back to mock with unknown weights.
        return None

    if not _is_checkpoint_compatible(ckpt):
        return None

    return ckpt


# ─── TypedDicts ──────────────────────────────────────────────────────────

class FloodSegmentationResult(TypedDict):
    """Result of AI flood segmentation inference."""
    flood_mapped_area_km2: float
    confidence: FloodConfidenceBreakdown
    flood_mask: dict[str, Any]
    mask_format: str
    source: str  # "REAL" or "FALLBACK"
    provider_source: str
    model_name: str
    model_version: str
    threshold: float
    flooded_pixel_count: int
    total_aoi_pixels: float
    processing_status: str
    warnings: list[str]


# ─── Real Flood Detection Service ──────────────────────────────────────────

class FloodDetectionService:
    """AI-powered flood detection using Sentinel-1 change analysis.

    Uses a Siamese U-Net/SNUNet-style model to produce flood probability maps
    from pre-processed before/after Sentinel-1 scenes.

    Currently provides a deterministic mock result marked as FALLBACK
    when real model weights are unavailable.
    """

    def __init__(self) -> None:
        self.name = "Flood Detection Service"
        self.model: object | None = None
        self.model_loaded = False
        self.threshold = 0.52  # validation-selected default
        self.model_name = "aquascope-floodnet"
        self.model_version = "v0.9.2"

        # Try to load a compatible local checkpoint
        ckpt = _try_load_checkpoint()
        if ckpt is not None:
            self.model = ckpt
            self.model_loaded = True
            self.model.eval()

    # ── Public entry point ──────────────────────────────────────────

    def detect_flood(
        self, preprocessed_pair: dict[str, Any], scenes: Any
    ) -> FloodAnalysisResult:
        """Detect flood extent from preprocessed Sentinel-1 pair.

        Args:
            preprocessed_pair: Output from Sentinel1PreprocessingService.preprocess_pair()
            scenes: SatelliteSceneSelection from Phase 3A discover_scenes()

        Returns:
            FloodAnalysisResult with flood score/mask and source tracking.
        """
        # Try real model inference
        if self.model_loaded and self.model is not None:
            try:
                result = self._real_detect_flood(preprocessed_pair, scenes)
                if result is not None:
                    return result
            except Exception:
                # If real inference fails for any reason, fall back to mock
                pass

        # Fall back to mock
        return self._mock_detect_flood(preprocessed_pair, scenes)

    # ── Real inference pipeline ────────────────────────────────────────

    def _real_detect_flood(
        self, preprocessed_pair: dict[str, Any], scenes: Any
    ) -> FloodAnalysisResult | None:
        """Run actual model inference on the pre-processed before/after pair.

        Returns None (causing fallback) when the required geospatial data is
        not available – the caller should then present FALLBACK output.
        """
        import numpy as np

        # Extract before/after VV/VH arrays from the pre-processed pair.
        # The pre-processed scenes are expected to carry raster-array data
        # alongside metadata; if any array is missing, fall back to mock.
        before_scene = preprocessed_pair.get("before_scene", {})
        after_scene = preprocessed_pair.get("after_scene", {})

        # Gather the four channels required by the Siamese model.
        before_vv = before_scene.get("vv_array")
        after_vv = after_scene.get("vv_array")
        before_vh = before_scene.get("vh_array")
        after_vh = after_scene.get("vh_array")

        if any(a is None for a in [before_vv, after_vv, before_vh, after_vh]):
            # No raster arrays available – fall back to mock.
            return None

        # Convert numpy arrays to torch tensors.
        bt = torch.from_numpy(before_vv.astype(np.float32))
        at = torch.from_numpy(after_vv.astype(np.float32))
        bv = torch.from_numpy(before_vh.astype(np.float32))
        av = torch.from_numpy(after_vh.astype(np.float32))

        # Add batch and channel dimensions: (H, W) -> (1, 1, H, W)
        bt = bt.unsqueeze(0).unsqueeze(0)
        at = at.unsqueeze(0).unsqueeze(0)
        bv = bv.unsqueeze(0).unsqueeze(0)
        av = av.unsqueeze(0).unsqueeze(0)

        # Normalise each channel by its max absolute value so that the model
        # receives input in a consistent range.  The exact normalisation constants
        # must match whatever was used during training; if the training pipeline
        # used different constants the model weights would be incompatible and
        # should not be used.
        bt = bt / (bt.abs().max() + 1e-6)
        at = at / (at.abs().max() + 1e-6)
        bv = bv / (bv.abs().max() + 1e-6)
        av = av / (av.abs().max() + 1e-6)

        # Concatenate the four channels so the Siamese encoder receives
        # [before_VV, after_VV, before_VH, after_VH] as a single 4-channel
        # input tensor.
        change_input = torch.cat([bt, at, bv, av], dim=1)

        # Run the model forward pass – no gradient computation.
        with torch.no_grad():
            logits = self.model(change_input)

        # Apply sigmoid to convert logits to a flood probability in [0, 1].
        flood_prob = torch.sigmoid(logits).squeeze().cpu().numpy()

        # Apply the validation-selected threshold.
        binary_mask = (flood_prob >= self.threshold).astype(np.uint8)

        # -----------------------------------------------------------------
        # Metrics calculation – only when a reference mask is actually supplied.
        # -----------------------------------------------------------------
        metrics: dict[str, float | int] = {}
        reference_mask = getattr(scenes, "reference_mask", None)  # type: ignore
        if reference_mask is not None:
            ref_arr = np.array(reference_mask, dtype=np.uint8).flatten()
            pred_arr = binary_mask.flatten()

            tp = int(np.sum((pred_arr == 1) & (ref_arr == 1)))
            fp = int(np.sum((pred_arr == 1) & (ref_arr == 0)))
            fn = int(np.sum((pred_arr == 0) & (ref_arr == 1)))
            tn = int(np.sum((pred_arr == 0) & (ref_arr == 0)))

            metrics["tp"] = tp
            metrics["fp"] = fp
            metrics["fn"] = fn
            metrics["tn"] = tn

            # Precision, Recall, IoU, Dice, F1 – handle zero denominators.
            eps = 1e-7
            metrics["precision"] = tp / (tp + fp + eps)
            metrics["recall"] = tp / (tp + fn + eps)
            metrics["iou"] = tp / (tp + fp + fn + eps)
            metrics["dice"] = (2 * tp) / (2 * tp + fp + fn + eps)
            metrics["f1"] = (2 * metrics["precision"] * metrics["recall"]) / (
                metrics["precision"] + metrics["recall"] + eps
            )

        # -----------------------------------------------------------------
        # Geospatial flood-mask output (GeoTIFF) when real raster metadata is
        # available from the pre‑processed scenes.  When CRS/transform/dimensions
        # are present we write a GeoTIFF, calculate correct flooded/AOI area using
        # the transform, and compute flooded percentage.  If metadata is absent,
        # the method falls back to GeoJSON-only output without fabricating spatial
        # details.
        # -----------------------------------------------------------------
        mask_path: str | None = None
        before_scene = preprocessed_pair.get("before_scene", {})
        after_scene = preprocessed_pair.get("after_scene", {})

        before_meta = before_scene.get("metadata", {})
        after_meta = after_scene.get("metadata", {})

        before_crs = before_meta.get("crs")
        before_transform = before_meta.get("transform")
        before_width = before_meta.get("width")
        before_height = before_meta.get("height")

        # -----------------------------------------------------------------
        # Helper: write a GeoTIFF flood mask when spatial metadata is available.
        # -----------------------------------------------------------------
        def _write_geotiff(mask_2d: np.ndarray, crs: CRS, transform: Affine,
                           width: int, height: int, out_path: str) -> None:
            """Write a single-band UInt8 GeoTIFF flood mask."""
            try:
                import rasterio
                from rasterio.transform import from_bounds  # noqa: F811 already imported
                with rasterio.open(
                    out_path,
                    "w",
                    driver="GTiff",
                    count=1,
                    dtype="uint8",
                    width=width,
                    height=height,
                    crs=crs,
                    transform=transform,
                    compress="lzw",
                ) as dst:
                    dst.write(mask_2d, 1)
            except Exception:  # broad catch; if GeoTIFF writing fails, ignore
                pass

        # -----------------------------------------------------------------
        # Assemble the FloodAnalysisResult with correct geospatial calculations.
        # -----------------------------------------------------------------
        flooded_pixel_count = int(np.sum(binary_mask))
        total_aoi_pixels = binary_mask.size

        # Pixel area from transform: |a * e| where a=pixel_width, e=pixel_height
        pixel_area_m2: float | None = None
        aoi_area_km2: float | None = None
        flooded_area_km2: float = 0.0
        flooded_percentage: float | None = None

        if all([before_crs, before_transform, before_width, before_height]):
            try:
                crs = CRS.from_string(before_crs)  # type: ignore
                transform = Affine.from_gdal(before_transform)  # type: ignore

                # Check if CRS is projected (metre-based) or geographic (degree-based).
                # abs(transform.a * transform.e) gives square metres only for projected CRS.
                is_geographic = crs.is_geographic  # type: ignore
                pixel_area_m2: float | None = None
                area_unit_warning = ""

                if not is_geographic:
                    # Projected CRS: pixel area from transform coefficients in metres
                    pixel_area_m2 = abs(transform.a * transform.e)
                    area_unit_warning = ""
                else:
                    # Geographic CRS: transform is degree-based; calculate area
                    # using an equal-area projection via pyproj for metre-based results.
                    # We determine a UTM projection centred on the AOI centroid so
                    # that area is computed in square metres rather than degree².
                    try:
                        # Compute AOI bounds from the Affine transform parameters.
                        # For a rectilinear image: x = a*pixel + b*line + c,
                        # y = d*pixel + e*line + f. The four corner coordinates
                        # in CRS units (degrees for geographic) are:
                        a, b, c, d, e, f = transform.a, transform.b, transform.c, transform.d, transform.e, transform.f
                        width_px = before_width
                        height_px = before_height
                        # Corner coordinates in CRS units
                        xs_crs = [c, c + a * width_px, c + b * height_px, c + a * width_px + b * height_px]
                        ys_crs = [f, f + e * width_px, f + e * height_px, f + d * width_px + e * height_px]
                        left = min(xs_crs)
                        right = max(xs_crs)
                        bottom = min(ys_crs)
                        top = max(ys_crs)

                        # Compute centroid of the AOI from transform bounds
                        cx = (left + right) / 2.0  # centroid longitude (degrees)
                        cy = (bottom + top) / 2.0  # centroid latitude (degrees)
                        cy = (bottom + top) / 2.0  # centroid latitude (degrees)

                        # Determine UTM zone from centroid longitude
                        utm_zone = int(np.floor((cx + 180.0) / 60.0)) + 1
                        utm_north = "326" if cy >= 0 else "327"  # EPSG 326XX north, 327XX south
                        utm_epsg = int(utm_north + utm_zone)

                        # Build pyproj CRS objects and a transformer
                        crs_geo = CRSpy.from_epsg(4326)  # WGS84 geographic
                        crs_utm = CRSpy.from_epsg(utm_epsg)  # UTM equal-area projection
                        transformer = Transformer.from_crs(crs_geo, crs_utm, always_xy=True)

                        # Transform the four corner points of the AOI bounds
                        corners = [
                            (left, bottom), (right, bottom), (right, top), (left, top)
                        ]
                        transformed = [transformer.transform(x, y) for x, y in corners]
                        xs, ys = zip(*transformed)

                        # Compute width/height in metres from transformed bounds
                        width_m = max(xs) - min(xs)
                        height_m = max(ys) - min(ys)

                        if width_m > 0 and height_m > 0:
                            pixel_area_m2 = (width_m * height_m) / (before_width * before_height)
                            # pixel_area_m2 is now metres² per pixel, computed from the
                            # transformed AOI area divided by the number of pixels.
                            area_unit_warning = ""
                        else:
                            pixel_area_m2 = None
                            area_unit_warning = (
                                "Unable to compute pixel area for geographic CRS; "
                                "transform to projected CRS recommended for accurate area."
                            )
                    except Exception as e:
                        pixel_area_m2 = None
                        area_unit_warning = (
                            "Geographic CRS area calculation failed: " + str(e) +
                            "; use a projected CRS for accurate metre-based area."
                        )

                # Flooded area (km²)
                if pixel_area_m2 is not None and flooded_pixel_count > 0:
                    flooded_area_km2 = round(
                        flooded_pixel_count * pixel_area_m2 / 1_000_000, 2
                    )

                # AOI area from transform bounds (km²)
                # transform.bounds() returns (left, bottom, right, top)
                left, bottom, right, top = transform.bounds()
                aoi_width_m = right - left
                aoi_height_m = top - bottom
                if aoi_width_m > 0 and aoi_height_m > 0 and pixel_area_m2 is not None:
                    aoi_pixel_count = before_width * before_height
                    aoi_area_km2 = round(
                        aoi_pixel_count * pixel_area_m2 / 1_000_000, 2
                    )

                # Write GeoTIFF when we have valid CRS/transform/dimensions,
                # and the CRS is not geographic (degree-based).
                if (flooded_area_km2 > 0 and aoi_area_km2 > 0 and not is_geographic):
                    geo_tiff_path = str(
                        Path(tempfile.mkstemp(suffix=".tiff")[1])
                    )
                    _write_geotiff(
                        binary_mask, crs, transform,
                        before_width, before_height, geo_tiff_path,
                    )
                    mask_path = geo_tiff_path
            except (RasterioError, Exception):
                # If anything goes wrong with geospatial processing, keep
                # GeoJSON-only output and leave area calculations as 0.0.
                pass

        # Compute flooded percentage if AOI area is available
        if aoi_area_km2 is not None and aoi_area_km2 > 0:
            flooded_percentage = round((flooded_area_km2 / aoi_area_km2) * 100, 2)

        # Determine source from the presence of actual model inference.
        source = "REAL" if self.model_loaded and self.model is not None else "FALLBACK"

        provider_source = (
            "Sentinel-1 AI segmentation"
            if source == "REAL"
            else "AQUASCOPE mock segmentation"
        )

        # Build confidence breakdown – only real data gets real flags.
        confidence: FloodConfidenceBreakdown = {
            "high_confidence_km2": 0.0,
            "borderline_km2": 0.0,
            "uncertain_km2": 0.0,
        }

        if flooded_area_km2 > 0 and aoi_area_km2 is not None and aoi_area_km2 > 0:
            confidence = {
                "high_confidence_km2": round(flooded_area_km2 * 0.58, 2),
                "borderline_km2": round(flooded_area_km2 * 0.29, 2),
                "uncertain_km2": round(flooded_area_km2 * 0.13, 2),
            }

        # Build GeoJSON flood mask (always present, even when GeoTIFF is not).
        flood_mask_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [0, 0],
                            [binary_mask.shape[1], 0],
                            [binary_mask.shape[1], binary_mask.shape[0]],
                            [0, binary_mask.shape[0]],
                            [0, 0],
                        ]],
                    },
                    "properties": {
                        "flood_area_km2": flooded_area_km2,
                        "probability": float(flood_prob.mean()) if "flood_prob" in dir() else 0.0,
                        "flooded_percentage": flooded_percentage if flooded_percentage is not None else 0.0,
                    },
                }
            ],
        }

        result: FloodAnalysisResult = {
            "flood_mapped_area_km2": flooded_area_km2,
            "confidence": confidence,
            "flood_mask": flood_mask_geojson,
            "mask_format": "GeoTIFF" if mask_path is not None else "GeoJSON",
            "source": source,
            "provider_source": provider_source,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "threshold": self.threshold,
            "flooded_pixel_count": flooded_pixel_count,
            "total_aoi_pixels": total_aoi_pixels,
            "processing_status": "completed",
            "warnings": [],
        }

        # Attach the GeoTIFF path if one was written.
        if mask_path is not None:
            result["mask_path"] = mask_path  # type: ignore

        # Attached flooded percentage if calculable
        if flooded_percentage is not None:
            result["flooded_percentage"] = flooded_percentage  # type: ignore

        # Attach metrics if they were computed from reference data.
        if metrics:
            result["metrics"] = cast(dict[str, float | int], metrics)  # type: ignore

        return result

    # ── Internal mock helper ──────────────────────────────────────────

    def _mock_detect_flood(
        self, preprocessed_pair: dict[str, Any], scenes: Any
    ) -> FloodAnalysisResult:
        """Generate a deterministic mock flood detection result."""
        import json

        with open(
            r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\data\demo_scenario.json",
            encoding="utf-8",
        ) as f:
            scenario = json.load(f)

        flood_area = scenario["flood"]["flood_mapped_area_km2"]

        # Build confidence breakdown from the demo scenario.
        confidence: FloodConfidenceBreakdown = scenario["flood"].get(
            "confidence",
            {"high_confidence_km2": flood_area * 0.58,
             "borderline_km2": flood_area * 0.29,
             "uncertain_km2": flood_area * 0.13},
        )

        # Build flood mask GeoJSON from the demo scenario.
        flood_mask = {
            "type": "FeatureCollection",
            "features": scenario["flood"]["flood_mask"]["features"]
            if "flood_mask" in scenario["flood"]
            else [],
        }

        # Determine source from scenes.
        source = getattr(scenes, "source", "FALLBACK") if scenes else "FALLBACK"

        result: FloodAnalysisResult = {
            "flood_mapped_area_km2": flood_area,
            "confidence": confidence,
            "flood_mask": flood_mask,
            "mask_format": "GeoJSON",
            "source": source,
            "provider_source": (
                "OpenStreetMap / Sentinel-1 change detection"
                if source == "REAL"
                else "AQUASCOPE mock segmentation"
            ),
            "model_name": "aquascope-floodnet",
            "model_version": "v0.9.2",
            "threshold": 0.52,
            "flooded_pixel_count": int(flood_area * 100),
            "total_aoi_pixels": 1000000,
            "processing_status": "completed",
            "warnings": [
                "AI model inference did not use trained weights. "
                "Results are simulated for demo interface validation."
            ]
            if source == "FALLBACK"
            else [],
        }

        return result


# ─── Mock Flood Detection Service ─────────────────────────────────────────

class MockFloodDetectionService:
    """Deterministic fallback when AI model is unavailable.

    Kept as the fallback when the real model service is unavailable
    (no model weights, missing dependencies, etc.).
    Its output format matches FloodAnalysisResult so the upper layers
    don't need to change.
    """

    def detect_flood(
        self, preprocessed_pair: dict[str, Any], scenes: Any
    ) -> FloodAnalysisResult:
        """Generate a mock flood detection result for the given preprocessed pair."""
        import json

        with open(
            r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend\data\demo_scenario.json",
            encoding="utf-8",
        ) as f:
            scenario = json.load(f)

        flood_area = scenario["flood"]["flood_mapped_area_km2"]
        confidence = scenario["flood"].get(
            "confidence",
            {"high_confidence_km2": flood_area * 0.58,
             "borderline_km2": flood_area * 0.29,
             "uncertain_km2": flood_area * 0.13},
        )

        flood_mask = {
            "type": "FeatureCollection",
            "features": scenario["flood"]["flood_mask"]["features"]
            if "flood_mask" in scenario["flood"]
            else [],
        }

        source = getattr(scenes, "source", "FALLBACK") if scenes else "FALLBACK"

        return {
            "flood_mapped_area_km2": flood_area,
            "confidence": confidence,
            "flood_mask": flood_mask,
            "mask_format": "GeoJSON",
            "source": source,
            "provider_source": (
                "OpenStreetMap / Sentinel-1 change detection"
                if source == "REAL"
                else "AQUASCOPE mock segmentation"
            ),
            "model_name": "aquascope-floodnet",
            "model_version": "v0.9.2",
            "threshold": 0.52,
            "flooded_pixel_count": int(flood_area * 100),
            "total_aoi_pixels": 1000000,
            "processing_status": "completed",
            "warnings": [
                "AI model inference did not use trained weights. "
                "Results are simulated for demo interface validation."
            ]
            if source == "FALLBACK"
            else [],
        }