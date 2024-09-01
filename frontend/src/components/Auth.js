// auth.js
export const credentialeAdmin = (username, password) => {
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "password";

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return true;
  } else {
    return false;
  }
};
