export const foo = "foo";

export function bar () {
  return "bar-bar-bar";
}

export function baz (msg) {
  return "baz-baz-baz " + msg;
}

export const biz = function (msg) {
  return "biz-biz-biz " + baz(msg);
};

export default function () {
  return "default";
}
