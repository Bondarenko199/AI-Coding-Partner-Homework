# API Reference (Concise)

Base URL: `http://localhost:3000`

## Model
- Required: `customer_id`, `customer_email`, `customer_name`, `subject` (1–200), `description` (10–2000), `metadata.source` (`web_form|email|api|chat|phone`), `metadata.device_type` (`desktop|mobile|tablet`)
- Optional: `category`, `priority`, `status`, `assigned_to`, `tags`, `resolved_at`
- Enums: status `new|in_progress|waiting_customer|resolved|closed`; category `account_access|technical_issue|billing_question|feature_request|bug_report|other`; priority `urgent|high|medium|low`

## Endpoints (one liners)
- `POST /tickets` (+`?autoClassify=true`) create ticket
- `GET /tickets` filter by `category|priority|status|customer_id|assigned_to`
- `GET /tickets/:id` get one
- `PUT /tickets/:id` update (any updatable fields; category/priority mark manual override)
- `DELETE /tickets/:id` delete
- `POST /tickets/import` body `{content, fileType: csv|json|xml, autoClassify}` → summary with 200/207/400
- `POST /tickets/:id/auto-classify` → `{ ticket, classification }`

## Minimal examples
Create:
```bash
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"C1","customer_email":"a@b.com","customer_name":"Ada",
       "subject":"Login issue","description":"Cannot access account",
       "metadata":{"source":"web_form","device_type":"desktop"}}'
```

List filtered:
```bash
curl "http://localhost:3000/tickets?category=billing_question&priority=high"
```

Import CSV:
```bash
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/json" \
  -d '{"content":"customer_id,customer_email,customer_name,subject,description,source,device_type\nC1,a@b.com,Ada,Login fail,Cannot login,web_form,desktop",
       "fileType":"csv","autoClassify":true}'
```

Auto-classify existing:
```bash
curl -X POST http://localhost:3000/tickets/ID/auto-classify
```

## Error shapes
- Validation: `{ "error": "Validation error", "details": [{ "message": "...", "path": "field" }] }`
- Not found: `{ "error": "Not found", "message": "..." }`
- Import: `{ total, successful, failed, errors: [{ row, error, data? }], tickets }`
