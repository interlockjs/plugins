define(["example/shared/lib", "lodash"], function (lib, _) {
  _.each([
    "this thing consumes",
    "code from another build",
    "from RequireJS"
  ], function (msg) {
    lib.print(msg);
  });
});
