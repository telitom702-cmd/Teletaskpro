import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTelegramLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useTelegramLogin();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
      return;
    }

    // Try auto-login if inside Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      handleLogin(tg.initData);
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = (initData: string) => {
    loginMutation.mutate(
      { data: { initData } },
      {
        onSuccess: (data) => {
          login(data.token);
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({
            title: "Login failed",
            description: err.message || "Could not authenticate with Telegram",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDevLogin = () => {
    // A mock initData for development outside of Telegram
    const mockInitData = "query_id=mock_dev_id&user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22Dev%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22devuser%22%7D&auth_date=1600000000&hash=mockhash";
    handleLogin(mockInitData);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TeliTask Pro</CardTitle>
          <CardDescription>Earn rewards by completing simple tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleDevLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Login (Dev Mode)"}
          </Button>
          <p className="text-xs text-center text-gray-500">
            Open this app inside Telegram to login automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
