const run = async () => {
  const mupdf = await import('mupdf');
  console.log(Object.keys(mupdf));
  // check Document
  console.log(Object.keys(mupdf.Document || {}));
};
run();
