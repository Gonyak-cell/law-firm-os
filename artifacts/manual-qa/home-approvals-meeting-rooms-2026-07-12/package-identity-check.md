# Package identity check

The packaged renderer was checked against the current built web renderer without launching or mutating the product.

Invocation:

```text
sha256 directory comparison:
apps/web/dist
apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web
```

Result: PASS. Both renderer directories produced:

```text
d96627406e709c0fdab413c4e7b8d2687f7152fe5ceb7b7fa224f2be5158c8b5
```

The entry JavaScript and CSS also matched byte-for-byte:

```text
index-TcMK3iaV.js  4293ba34cc730f1200ecb6e7319e3802a050af7c2c2cb672a9395cb11a16a5de
index-OM1-ESVs.css 8a1b4153a1fa2e6f7e33ee2bb142ad9860de1d71551a0167d6e30b100b2a349f
```
