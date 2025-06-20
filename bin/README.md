# UMT Parse CLI

This provides an example of how to use the UMT core library to parse data from
stdin and write the result to stdout. It loads all the plugins in this repo.

`pnpm cli:parse <input-mime-type> <output-mime-type>`

## Usage

```bash
echo '# Markdown\nSample content.' | pnpm cli:parse text/markdown application/xml
```

The first mime-type is the input mime-type, and the second mime-type is the
output mime-type. If output is ommited, it will default to the input mime-type,
so you should get the same stdin string back.
