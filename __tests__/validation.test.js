/**
 * Validation Schema Tests
 * Unit tests for Joi validation schemas
 */

const Joi = require('joi');
const { schemas } = require('../utils/validation');

describe('Validation Schemas - Signup', () => {
  it('should accept valid signup data', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'ValidPass123!',
      college: 'MIT',
      year: '2024'
    };

    const { error, value } = schemas.signup.validate(data);
    expect(error).toBeUndefined();
    expect(value.email).toBe('john@example.com'); // lowercase
  });

  it('should lowercase email', () => {
    const data = {
      name: 'John Doe',
      email: 'JOHN@EXAMPLE.COM',
      password: 'ValidPass123!'
    };

    const { value } = schemas.signup.validate(data);
    expect(value.email).toBe('john@example.com');
  });

  it('should reject invalid email', () => {
    const data = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'ValidPass123!'
    };

    const { error } = schemas.signup.validate(data);
    expect(error).toBeDefined();
  });

  it('should reject short password', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'short'
    };

    const { error } = schemas.signup.validate(data);
    expect(error).toBeDefined();
  });

  it('should require name', () => {
    const data = {
      email: 'john@example.com',
      password: 'ValidPass123!'
    };

    const { error } = schemas.signup.validate(data);
    expect(error).toBeDefined();
  });

  it('should trim whitespace from name', () => {
    const data = {
      name: '  John Doe  ',
      email: 'john@example.com',
      password: 'ValidPass123!'
    };

    const { value } = schemas.signup.validate(data);
    expect(value.name).toBe('John Doe');
  });
});

describe('Validation Schemas - Login', () => {
  it('should accept valid login data', () => {
    const data = {
      email: 'john@example.com',
      password: 'ValidPass123!'
    };

    const { error } = schemas.login.validate(data);
    expect(error).toBeUndefined();
  });

  it('should require email', () => {
    const data = {
      password: 'ValidPass123!'
    };

    const { error } = schemas.login.validate(data);
    expect(error).toBeDefined();
  });

  it('should require password', () => {
    const data = {
      email: 'john@example.com'
    };

    const { error } = schemas.login.validate(data);
    expect(error).toBeDefined();
  });
});

describe('Validation Schemas - Payment', () => {
  it('should accept valid createOrder data', () => {
    const data = {
      amount: 99.99,
      certificateId: '550e8400-e29b-41d4-a716-446655440000',
      internshipId: '550e8400-e29b-41d4-a716-446655440001'
    };

    const { error } = schemas.createOrder.validate(data);
    expect(error).toBeUndefined();
  });

  it('should reject negative amount', () => {
    const data = {
      amount: -99,
      certificateId: '550e8400-e29b-41d4-a716-446655440000'
    };

    const { error } = schemas.createOrder.validate(data);
    expect(error).toBeDefined();
  });

  it('should require amount', () => {
    const data = {
      certificateId: '550e8400-e29b-41d4-a716-446655440000'
    };

    const { error } = schemas.createOrder.validate(data);
    expect(error).toBeDefined();
  });
});

describe('Validation Schemas - Task Submission', () => {
  it('should accept valid task submission', () => {
    const data = {
      taskId: '550e8400-e29b-41d4-a716-446655440002',
      githubLink: 'https://github.com/username/repo'
    };

    const { error } = schemas.submitTask.validate(data);
    expect(error).toBeUndefined();
  });

  it('should reject invalid URL', () => {
    const data = {
      taskId: '550e8400-e29b-41d4-a716-446655440002',
      githubLink: 'not-a-url'
    };

    const { error } = schemas.submitTask.validate(data);
    expect(error).toBeDefined();
  });

  it('should require valid taskId UUID', () => {
    const data = {
      taskId: 'invalid-id',
      githubLink: 'https://github.com/user/repo'
    };

    const { error } = schemas.submitTask.validate(data);
    expect(error).toBeDefined();
  });
});
