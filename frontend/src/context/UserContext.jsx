import { createContext, useContext, useEffect, useState } from "react";
import api from "../hooks/api";

const UserContext = createContext(null);

function formatUser(userData) {
  return {
    id: userData.id,
    isAuthenticated: true,
    firstName: userData.first_name,
    lastName: userData.last_name,
    fullName: `${userData.first_name} ${userData.last_name}`,
    dateOfBirth: userData.date_of_birth,
    gender: userData.gender,
    email: userData.email,
    phoneNumber: userData.phone_number,
    profilePicture: userData.profile_picture,
    profilePictureUpdatedAt: userData.profile_picture_updated_at,
    dateJoined: userData.date_joined,
    emailVerified: userData.email_verified,
    twoFactorEnabled: userData.two_factor_enabled,
    role: userData.role,
  };
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUser = async () => {
    setLoading(true);

    try {
      const response = await api.get("/user/me/");
      setUser(formatUser(response.data.user));
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  const login = (userData) => {
    setUser(formatUser(userData));
    setLoading(false);
  };

  const updateProfile = async (payload) => {
    try {
      const response = await api.patch("/user/profile/update/", payload);

      const formattedUser = formatUser(response.data.user);
      setUser(formattedUser);

      return {
        success: true,
        user: formattedUser,
      };
    } catch (error) {
      const isNoChange = error.response?.data?.is_no_change;

      return {
        success: false,
        errors: error.response?.data?.errors,
        singleError: isNoChange
          ? "No changes were made."
          : "Failed to update profile.",
      };
    }
  };

  const logout = async () => {
    try {
      await api.post("/user/logout/");
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const clearUser = () => {
    setUser(null);
    setLoading(false);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        getUser,
        updateProfile,
        clearUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}

export default UserContext;
