exports.encode = function(text, num = 1) {
  return text.split('').map(v => String.fromCharCode(v.charCodeAt(0) + num)).join('');
};

exports.decode = function(text, num = 1) {
  return text.split('').map(v => String.fromCharCode(v.charCodeAt(0) - num)).join('');
};