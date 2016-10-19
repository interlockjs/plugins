export const unusedThing = function () {
  return "this should not be referenced, and would be removed by a minifier";
};

export const thing = function () {
  console.log("it works!");
};
thing.metaData = "interesting factoid";
