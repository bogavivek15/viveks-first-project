import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { PageMeta } from '@/components/PageMeta';

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <PageMeta title="Page Not Found" />
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-2">
          The page <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> doesn't exist.
        </p>
        <p className="text-muted-foreground mb-8">
          It may have been moved or the URL might be incorrect.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button className="bg-gradient-to-r from-primary to-accent gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
