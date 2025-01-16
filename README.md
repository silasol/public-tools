# public-tools

## API

```bash
curl --request POST \
  --url https://pub.reao.io/xhs \
  --header 'Content-Type: text/plain; charset=utf-8' \
  --data '0 瑞哥英语发布了一篇小红书笔记，快来看吧！ 😆 sqRkSq3fZVTMu3x 😆 http://xhslink.com/a/jnjXB1zdPnP3，复制本条信息，打开【小红书】App查看精彩内容！'
 ```

## Development

```
pnpm install
pnpm run dev
```

## Deploy

deploy to cloudflare worker

```
pnpm run deploy
```

## thanks

https://github.com/sanmiaohub/video_spider
