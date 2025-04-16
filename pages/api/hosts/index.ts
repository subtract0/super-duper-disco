import type { NextApiRequest, NextApiResponse } from "next";

import { getHosts, saveHosts } from '../../../__mocks__/persistentStore';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // List all hosts from persistent store
    const hosts = getHosts();
    res.status(200).json({ hosts });
  } else if (req.method === "POST") {
    // Add (register) a new host to persistent store
    const hosts = getHosts();
    const newHost = {
      id: uuidv4(),
      name: req.body.name,
      status: "online",
    };
    hosts.push(newHost);
    saveHosts(hosts);
    res.status(201).json({ ok: true, host: newHost });
  } else {
    res.status(405).end();
  }
}
