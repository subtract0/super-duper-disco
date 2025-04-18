// pages/api/hello.ts
export default function handler(req: any, res: any) {
  res.status(200).json({ status: "ok", message: "Hello route static response." });
}
