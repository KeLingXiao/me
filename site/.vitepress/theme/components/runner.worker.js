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
    let executable = data.code;
    if (data.language === 'typescript') {
      const module = await import('typescript/lib/typescript.js');
      const ts = module.default || module;
      const result = ts.transpileModule(executable, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
        reportDiagnostics: true,
      });
      const errors = result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error) || [];
      if (errors.length) throw new SyntaxError(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
      executable = result.outputText;
    }
    const result = await new AsyncFunction("input", "console", executable)(
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
