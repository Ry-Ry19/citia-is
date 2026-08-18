import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="px-0">
        <div className="flex justify-center">
          <p className="text-sm font-medium text-primary">CENRO STAFF PORTAL</p>
        </div>
        <CardTitle>Sign in to CITIA-IS</CardTitle>
        <CardDescription>
          Enter your email and password to sign in to your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        <form className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>

            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>

            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
