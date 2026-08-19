"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full bg-transparent">
      <CardHeader className="px-0 pt-0">
        {/* Portal Label */}
        <div className="flex justify-center mb-4">
          <p className="text-xs font-bold tracking-wider text-primary">
            CENRO STAFF PORTAL
          </p>
        </div>

        {/* Heading */}
        <div className="space-y-0">
          <CardDescription className="text-sm flex justify-center leading-relaxed mb-5">
            Sign in to access
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <form className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>

            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              className="h-11"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/admin/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-11 pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg">
            Sign In
          </Button>
          {/* Below the Sign In button, inside the form */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Not staff?{" "}
            <Link href="/" className="text-primary hover:underline font-medium">
              Return to community access
            </Link>
          </p>
        </form>
      </CardContent>
    </div>
  );
}
