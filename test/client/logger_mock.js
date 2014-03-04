module.exports = function loggerMock() {
  return function() {
    return function() {};
  }
}
