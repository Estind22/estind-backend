// utils/validateFormFieldsjs
const validateFormFields = (payload) => {
  const errors = [];

    // const isServiceFieldPresent = false;
  for (const field of payload.fields) {

    if (field && field.type === "select") {
      if (!payload?.options || !payload?.options?.length) {
        errors.push(`Options are mandatory for type select input`);
      }
      }
      if (field && field.key == "service") {
          isServiceFieldPresent = true;
      }
    }
    
    // if (!isServiceFieldPresent)
    //     errors.push('Service field must be present');

  return errors;
};

// utils/validateFormPayload.js
const validateFormPayload = (form, payload) => {
  const errors = [];

  for (const field of form.fields) {
    const value = payload[field.key];

    if (field.required && !value) {
      errors.push(`${field.label} is required`);
    }

    if (value && field.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`Invalid email`);
      }
    }

    if (value && field.type === "phone") {
      if (!/^\d{7,15}$/.test(value)) {
        errors.push(`Invalid phone number`);
      }
    }
  }

  return errors;
};

export {
    validateFormPayload,
    validateFormFields
}