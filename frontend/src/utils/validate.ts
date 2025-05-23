import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format');

export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(6, 'Password must be at least 6 characters');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long');

export const boardNameSchema = z
  .string()
  .min(1, 'Board name is required')
  .max(100, 'Board name is too long');

/**
 * Validate email format
 * @param email Email to validate
 * @returns True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const result = emailSchema.safeParse(email);
  return result.success;
};
