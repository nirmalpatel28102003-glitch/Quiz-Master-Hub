import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-gradient-sunset shadow-pop-sm">
            <Sparkles className="size-4 text-ink" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Quizzly</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/quizzes"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Browse
          </Link>
          {!loading && user ? (
            <>
              <Link
                to="/my-quizzes"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:block"
                activeProps={{ className: "text-foreground" }}
              >
                My quizzes
              </Link>
              <Button asChild variant="pop" size="sm">
                <Link to="/create">Create</Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild variant="pop" size="sm">
              <Link to="/auth" search={{ redirect: undefined }}>Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
