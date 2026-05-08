function logEvent_(type, data) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: type,
    data: data || {}
  }));
}

