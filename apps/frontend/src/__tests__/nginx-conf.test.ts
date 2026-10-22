/**
 * TDD RED: nginx sitzt hinter Caddy (Netz "web"). Ohne realip sieht jede
 * Anfrage aus wie von Caddy (Live-Log 22.10.: nur 172.20.0.2) — alle
 * Besucher teilten sich einen Drosselungs-Zähler für Login und Kündigung.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const conf = readFileSync(resolve(__dirname, "../../nginx.conf"), "utf8");

describe("nginx.conf", () => {
  it("takes the client IP from Caddy's X-Forwarded-For", () => {
    expect(conf).toMatch(/real_ip_header\s+X-Forwarded-For;/);
    expect(conf).toMatch(/real_ip_recursive\s+on;/);
  });

  it("trusts only private Docker networks as proxies", () => {
    const trusted = [...conf.matchAll(/set_real_ip_from\s+([^;]+);/g)].map(
      (m) => m[1].trim(),
    );
    expect(trusted).toEqual(
      expect.arrayContaining(["172.16.0.0/12", "10.0.0.0/8", "192.168.0.0/16"]),
    );
    expect(trusted).not.toContain("0.0.0.0/0");
  });

  it("forwards the resolved client IP to the backend", () => {
    expect(conf).toMatch(/proxy_set_header\s+X-Real-IP\s+\$remote_addr;/);
  });
});
