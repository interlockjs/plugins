export default function (opts = {}) {
  return (override, transform, shared) => {
    transform("setModuleType", function (module) {
    });
  };
}
