'use client';

import PropTypes from 'prop-types';
import { useMemo, useEffect, useReducer, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { supabase } from './lib';
import { AuthContext } from './auth-context';


// ----------------------------------------------------------------------
// Initial state for auth
const initialState = {
  user: null,
  loading: true,
};

// Reducer to handle authentication actions
const reducer = (state, action) => {
  switch (action.type) {
    case 'INITIAL':
      return {
        loading: false,
        user: action.payload.user,
      };
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
      };
    case 'REGISTER':
      return {
        ...state,
        user: action.payload.user,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
      };
    default:
      return state;
  }
};

// ----------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initialize auth state on mount
  const initialize = useCallback(async () => {
    try {
      const savedUserId = localStorage.getItem('user_id');

      if (savedUserId) {
        // If user_id exists in localStorage, attempt to restore session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          dispatch({
            type: 'INITIAL',
            payload: {
              user: null,
            },
          });
          console.error(error);
          throw error;
        }

        if (session?.user) {

          dispatch({
            type: 'INITIAL',
            payload: {
              user: {
                ...session?.user,
                displayName: session?.user.user_metadata?.displayName,
                session: {
                  access_token: session.access_token,
                  expires_at: session.expires_at,
                  expires_in: session.expires_in,
                  refresh_token: session.refresh_token,
                  token_type: session.token_type,
                },
              },
            },
          });
        } else {
          dispatch({
            type: 'INITIAL',
            payload: {
              user: null,
            },
          });
        }
      } else {
        // No user_id in localStorage, set unauthenticated state
        dispatch({
          type: 'INITIAL',
          payload: {
            user: null,
          },
        });
      }
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'INITIAL',
        payload: {
          user: null,
        },
      });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // LOGIN: Handle user login and store user_id in localStorage
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      dispatch({
        type: 'LOGIN',
        payload: {
          user: null,
        },
      });
      console.error(error);
      throw error;
    } else {

      // Gate admin-app access by role. Customers must use the public site.
      const role = data.user?.app_metadata?.role ?? 'customer';
      if (!['staff', 'admin'].includes(role)) {
        await supabase.auth.signOut();
        dispatch({ type: 'LOGIN', payload: { user: null } });
        throw new Error('This account does not have admin access.');
      }

      const userData = {
        ...data.user,
        displayName: data.user.user_metadata?.displayName,
        session: {
          access_token: data.session.access_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          refresh_token: data.session.refresh_token,
          token_type: data.session.token_type,
        },
      };

      // 👇 NEW: Set Supabase session to sync cookies for SSR/middleware
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Save user ID to localStorage
      if (userData.id) {
        localStorage.setItem('user_id', userData.id);
      }

      console.log("USERDATA", userData);
      dispatch({
        type: 'LOGIN',
        payload: {
          user: userData,
        },
      });
    }
  }, []);

  // REGISTER: Handle user registration
  const register = useCallback(async (email, password, firstName, lastName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${paths.dashboard.root}`,
        data: {
          display_name: `${firstName} ${lastName}`,
        },
      },
    });

    if (error) {
      console.error(error);
      throw error;
    }
  }, []);

  // LOGOUT: Handle user logout and clear user_id from localStorage
  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      throw error;
    }

    // Clear the user_id from localStorage
    localStorage.removeItem('user_id');

    dispatch({
      type: 'LOGOUT',
    });
  }, []);

  // FORGOT PASSWORD: Handle password reset
  const forgotPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${paths.auth.supabase.newPassword}`,
    });

    if (error) {
      console.error(error);
      throw error;
    }
  }, []);

  // NEW PASSWORD: Update the user's password
  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error(error);
      throw error;
    }
  }, []);

  // Determine auth status based on loading state and user
  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';
  const status = state.loading ? 'loading' : checkAuthenticated;

  // Memoized context value to pass down to children.
  // Role comes from app_metadata.role, which is set server-side by the
  // public.user → auth.users.app_metadata sync trigger. app_metadata is
  // tamper-proof from the client; users cannot self-promote.
  // Default: 'customer' (least privilege) if role is missing.
  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            role: state.user?.app_metadata?.role ?? 'customer',
            displayName:
              state.user?.user_metadata?.display_name ||
              state.user?.user_metadata?.full_name ||
              state.user?.email ||
              '',
            photoURL: state.user?.user_metadata?.avatar_url ?? null,
          }
        : null,
      method: 'supabase',
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      login,
      register,
      logout,
      forgotPassword,
      updatePassword,
    }),
    [forgotPassword, login, logout, updatePassword, register, state.user, status]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node,
};
