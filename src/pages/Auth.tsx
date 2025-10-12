import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoImage from "@/assets/logoa.png";

type AuthView = "login" | "signup" | "reset";

const Auth = () => {
  const [view, setView] = useState<AuthView>("login");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <img src={logoImage} alt="MyScholr Logo" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">MyScholr</h1>
          <p className="mt-2 text-muted-foreground">Your digital academic companion</p>
        </div>

        {view === "reset" ? (
          <div className="rounded-xl border bg-card p-6 shadow-lg">
            <PasswordResetForm onBack={() => setView("login")} />
          </div>
        ) : (
          <Tabs value={view} onValueChange={(v) => setView(v as AuthView)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <div className="mt-4 rounded-xl border bg-card p-6 shadow-lg">
              <TabsContent value="login" className="mt-0">
                <LoginForm onForgotPassword={() => setView("reset")} />
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <SignupForm />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Auth;
