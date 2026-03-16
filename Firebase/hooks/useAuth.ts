import { User } from "@react-native-firebase/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
    getUserData,
    login,
    logout,
    register,
    resetPassword,
    updateProfileCompletion,
} from "../services/AuthService";

type AuthPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
};

export const useLogin = () => {
  return useMutation({
    mutationFn: ({ email, password }: AuthPayload) => login(email, password),
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: ({ email, password, name }: RegisterPayload) =>
      register(email, password, name),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => resetPassword(email),
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: () => logout(),
  });
};

export const useUpdateProfileCompletion = () => {
  return useMutation({
    mutationFn: ({ uid, stage }: { uid: string; stage: string }) =>
      updateProfileCompletion(uid, stage),
  });
};

export const useUser = (uid: string | undefined) => {
  return useQuery({
    queryKey: ["user", uid],
    queryFn: () => (uid ? getUserData(uid) : null),
    enabled: !!uid,
  });
};

// Hook to check authentication state
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading, isAuthenticated: !!user };
};
