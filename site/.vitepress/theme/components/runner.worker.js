self.onmessage = async ({ data }) => {
  let count = 0;
  const format = (value) => {
    if (typeof value === "string") return value.slice(0, 8000);
    try {
      return (JSON.stringify(value) ?? String(value)).slice(0, 8000);
    } catch {
      return String(value).slice(0, 8000);
    }
  };
  const log = (...args) => {
    if (count++ < 100)
      self.postMessage({
        type: "log",
        text: args.slice(0, 20).map(format).join(" "),
      });
  };
  try {
    const input = JSON.parse(data.input);
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    const result = await new AsyncFunction("input", "console", data.code)(
      input,
      { log, info: log, warn: log, error: log },
    );
    self.postMessage({
      type: "done",
      text: result === undefined ? "执行完成" : `返回值：${format(result)}`,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      text: `${error.name}: ${error.message}`.slice(0, 8000),
    });
  }
};
