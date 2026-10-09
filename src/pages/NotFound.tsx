import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full items-center justify-center bg-navy-900">
      <EmptyState
        icon={<Compass size={26} />}
        title="Page not found"
        message="The page you are looking for does not exist in this AQUASCOPE build."
        action={
          <Button onClick={() => navigate('/home')} icon={<Home size={15} />}>
            Back to Home
          </Button>
        }
      />
    </div>
  );
}
