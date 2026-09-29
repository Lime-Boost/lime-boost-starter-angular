---
name: feedback4
description: >-
  Lists every DynamoDB row with Lime Boost GET ALL on /feedback (Scan),
  parses JSON Items, and never treats empty Scan objects or whitespace as
  missing table data. Use when working on the Feedback page, getAll(),
  Load all, or API Gateway GET /feedback vs GET /feedback/{id}.
---

# GET ALL /feedback

List every row in the `feedback` DynamoDB table through Lime Boost API Gateway.

## Endpoint

```
GET ALL  →  GET https://lvdh4upei1.execute-api.eu-north-1.amazonaws.com/prod/feedback
GET one  →  GET .../prod/feedback/{id}
PUT row  →  POST .../prod/feedback
```

Send `Content-Type: application/json` on GET ALL. Use `responseType: 'text'`.

Wire `FeedbackService.getAll()` to GET ALL. **Load all** and `ngOnInit` must call it.

## GET one vs GET ALL

`GET /{id}` (GetItem) prints each attribute with `$util.escapeJavaScript(...)` and returns real values.

`GET /feedback` (Scan) must not use `$item.put` + `$util.toJsonString`. That returns the right number of objects with empty strings (`id`, `name`, `description`, …). The table then has the correct row count and no content.

Use this GET ALL **Integration response** 200 template (`application/json`), then deploy the stage:

```
[
#foreach($i in $input.path('$.Items'))
{
#foreach($key in $i.keySet())
  "$key": "$util.escapeJavaScript($i.get($key).entrySet().iterator().next().value)"#if($foreach.hasNext),#end
#end
}#if($foreach.hasNext),#end
#end
]
```

Or pass DynamoDB JSON through and let the app unwrap `{ S, N, BOOL }`:

```
$input.json('$')
```

If Scan items have `id` but empty name/description, `getAll()` hydrates each row with `GET /{id}`. Empty `id` cannot be hydrated.
