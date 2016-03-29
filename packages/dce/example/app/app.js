import { foo, biz, default as def } from "./lib";

console.log("foo", foo);
console.log("biz", biz("msg"));
console.log("default", def());
