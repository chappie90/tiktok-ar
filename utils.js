export const asyncTimeout = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

export const sanitizeText = text => text.replace(/</g, '&lt;');
