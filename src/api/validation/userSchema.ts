import * as yup from 'yup';
import { UserRole } from '../../enum';

// Email validation - disallow example.com domain and similar test domains
const validEmailDomains = [
  'gmail.com', 
  'yahoo.com', 
  'outlook.com', 
  'hotmail.com', 
  'icloud.com', 
  'aol.com', 
  'protonmail.com', 
  'zoho.com',
  'mail.com'
];

const invalidDomains = [
  'example.com',
  'test.com',
  'domain.com',
  'email.com',
  'temporary.com',
  'fake.com',
  'sample.com'
];

// Custom email validation
const emailValidator = yup.string()
  .email('Enter a valid email address')
  .test(
    'valid-domain',
    'Email must be from a valid provider (gmail.com, yahoo.com, etc.)',
    (value) => {
      if (!value) return false;
      const domain = value.split('@')[1].toLowerCase();
      
      // Check if email is from allowed domains
      const isValidDomain = validEmailDomains.includes(domain);
      
      // Check if email is from explicitly disallowed domains
      const isInvalidDomain = invalidDomains.includes(domain);
      
      // For domains not explicitly listed, consider them valid (e.g., company domains)
      return isValidDomain || (!isInvalidDomain && domain.includes('.'));
    }
  );

// Password validation
const passwordValidator = yup.string()
  .min(8, 'Password must be at least 8 characters')
  .max(50, 'Password cannot exceed 50 characters')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&_]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

// Name validation
const nameValidator = yup.string()
  .min(3, 'Name must be at least 3 characters')
  .max(50, 'Name cannot exceed 50 characters')
  .matches(
    /^[a-zA-Z\s]*$/,
    'Name must contain only letters and spaces'
  );

// Registration schema
export const registerSchema = yup.object().shape({
  email: emailValidator.required('Email is required'),
  password: passwordValidator.required('Password is required'),
  name: nameValidator.required('Name is required'),
  role: yup.string()
    .oneOf(Object.values(UserRole), 'Invalid role')
    .required('Role is required')
});

// Login schema
export const loginSchema = yup.object().shape({
  email: emailValidator.required('Email is required'),
  password: passwordValidator.required('Password is required')
}); 