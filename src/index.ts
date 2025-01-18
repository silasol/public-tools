import {Hono} from 'hono'

import {parseRedNoteData, Record} from './xhs';

const app = new Hono()

app.get('/', (c) => {

    const welcomeMsg = `Source Code: https://github.com/silasol/public-tools

Powered By Cloudflare Workers`

    return c.text(welcomeMsg)
})

app.post('/xhs', async (c) => {
    // get body as string
    const body = await c.req.text();

    // find url by regex
    const link = body.split(/[，\s]+/).find((part) => {
        return part.startsWith('http://xhslink.com/')
    })

    console.log("Link:", link);

    if (!link) {
        return c.json({code: 400, errmsg: 'No XHS URL found in the body.', data: {}})
    }

    const record: Record = {
        link: link,
        type: 0,
        title: "",
        desc: "",
        cover: "",
        video: "",
        resource_path: null
    }

    let error: Error | null = null;

    try {
        await parseRedNoteData(record)
    } catch (e) {
        if (e instanceof Error) {
            error = e;
        } else {
            error = new Error('An unknown error occurred');
        }
    }

    if (error != null) {
        return c.json({code: 400, errmsg: error.message, data: {}})
    } else {
        return c.json({code: 200, errmsg: "", data: record})
    }
})

export default app
