import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseHTML } from "linkedom";
import { checkoutSha, history, syncProject } from "../src/git.ts";
import { resolvePinTarget } from "../src/pin-target.js";

function queryRoundtrip(attr: "data-od-id" | "data-review-id", value: string) {
  const { document } = parseHTML("<!doctype html><html><body></body></html>");
  const node = document.createElement("article");
  node.setAttribute(attr, value);
  document.body.append(node);
  const pin = resolvePinTarget(node);
  return { pin, found: document.querySelector(pin.selector), node };
}

type Attrs = Record<string, string>;

type FakeNode = {
  nodeType: 1;
  nodeName: string;
  className: string;
  id: string;
  parentElement: FakeNode | null;
  children: FakeNode[];
  attrs: Attrs;
  getAttribute(name: string): string | null;
  closest(selector: string): FakeNode | null;
};

function el(tag: string, attrs: Attrs = {}, kids: FakeNode[] = []): FakeNode {
  const node: FakeNode = {
    nodeType: 1,
    nodeName: tag.toUpperCase(),
    className: attrs.class ?? "",
    id: attrs.id ?? "",
    parentElement: null,
    children: [],
    attrs,
    getAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name]! : null;
    },
    closest(selector: string) {
      const parts = selector.split(",").map((part) => part.trim());
      let current: FakeNode | null = this;
      while (current) {
        if (parts.some((part) => matchesAttrSelector(current!, part))) return current;
        current = current.parentElement;
      }
      return null;
    },
  };
  for (const child of kids) {
    child.parentElement = node;
    node.children.push(child);
  }
  return node;
}

function matchesAttrSelector(node: FakeNode, selector: string): boolean {
  const match = selector.match(/^\[([a-z0-9-]+)(?="([^"]*)")?\]$/i);
  if (!match) return false;
  const value = node.getAttribute(match[1]);
  if (value == null) return false;
  if (match[2] === undefined) return true;
  return value === match[2];
}

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || args.join(" "));
  }
}

function productCard(odId: string): FakeNode {
  return el("article", { "data-od-id": odId, class: "product-card" }, [
    el("img", { class: "photo", alt: odId }),
    el("div", { class: "meta" }, [
      el("span", { class: "rating" }, []),
      el("strong", { class: "price" }, []),
    ]),
    el("button", { class: "buy" }, []),
  ]);
}

test("data-review-id on the clicked node becomes the selector and reviewId", () => {
  const hero = el("h1", { "data-review-id": "hero-title" });
  expect(resolvePinTarget(hero)).toEqual({
    selector: '[data-review-id="hero-title"]',
    reviewId: "hero-title",
    node: hero,
  });
});

test("data-od-id on the clicked node becomes the selector and reviewId", () => {
  const card = el("article", { "data-od-id": "product-hat" });
  expect(resolvePinTarget(card)).toEqual({
    selector: '[data-od-id="product-hat"]',
    reviewId: "product-hat",
    node: card,
  });
});

test("data-review-id wins over data-od-id on the same node", () => {
  const node = el("section", {
    "data-review-id": "legacy-hero",
    "data-od-id": "hero",
  });
  expect(resolvePinTarget(node)).toMatchObject({
    selector: '[data-review-id="legacy-hero"]',
    reviewId: "legacy-hero",
    node,
  });
});

test("click inside a product card binds to the nearest data-od-id card", () => {
  const hat = productCard("product-hat");
  const bag = productCard("product-bag");
  el("div", { class: "grid" }, [hat, bag]);

  const price = hat.children[1]!.children[1]!;
  const rating = hat.children[1]!.children[0]!;
  const buy = hat.children[2]!;
  const photo = hat.children[0]!;

  for (const target of [price, rating, buy, photo]) {
    const pin = resolvePinTarget(target);
    expect(pin).toMatchObject({
      selector: '[data-od-id="product-hat"]',
      reviewId: "product-hat",
      node: hat,
    });
  }
  expect(resolvePinTarget(bag.children[2]!)).toMatchObject({
    selector: '[data-od-id="product-bag"]',
    reviewId: "product-bag",
    node: bag,
  });
});

test("fallback CSS path is used when there is no stable anchor", () => {
  const firstPrice = el("strong", { class: "price" });
  const secondPrice = el("strong", { class: "price" });
  el("div", { class: "grid" }, [
    el("article", { class: "product-card" }, [firstPrice]),
    el("article", { class: "product-card" }, [secondPrice]),
  ]);

  const pin = resolvePinTarget(secondPrice);
  expect(pin.node).toBe(secondPrice);
  expect(pin.reviewId).toBeNull();
  expect(pin.selector).toContain("nth-of-type");
  expect(pin.selector).toContain("strong.price");
  expect(pin.selector.startsWith("[data-")).toBe(false);
});

test("stable od-id still finds the same product after a later commit SHA", async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "dr-od-repo-"));
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Test"]);
  fs.mkdirSync(path.join(repo, "variant-a"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, "variant-a", "index.html"),
    `<html><body>
      <article data-od-id="product-hat"><strong class="price">1290</strong></article>
      <article data-od-id="product-bag"><strong class="price">2400</strong></article>
    </body></html>`,
  );
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "catalog v1"]);
  fs.writeFileSync(
    path.join(repo, "variant-a", "index.html"),
    `<html><body>
      <div class="grid">
        <article data-od-id="product-bag"><div class="wrap"><strong class="price">2400</strong></div></article>
        <article data-od-id="product-hat"><div class="wrap"><strong class="price">1290</strong></div></article>
      </div>
    </body></html>`,
  );
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "catalog v2 reorder"]);

  const hat = productCard("product-hat");
  el("div", { class: "grid" }, [hat, productCard("product-bag")]);
  const pin = resolvePinTarget(hat.children[1]!.children[1]!);
  expect(pin.selector).toBe('[data-od-id="product-hat"]');
  expect(pin.reviewId).toBe("product-hat");

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-od-data-"));
  const project = { id: 1, git_url: repo, branch: "main", ssh_key_path: null };
  await syncProject(dataDir, project);
  const entries = await history(dataDir, project, [{ key: "a", label: "A", git_path: "variant-a" }]);
  expect(entries[0]?.subject).toBe("catalog v2 reorder");
  expect(entries[1]?.subject).toBe("catalog v1");
  const later = await checkoutSha(dataDir, project, entries[0]!.sha);
  const earlier = await checkoutSha(dataDir, project, entries[1]!.sha);
  const htmlV1 = fs.readFileSync(path.join(earlier, "variant-a", "index.html"), "utf8");
  const htmlV2 = fs.readFileSync(path.join(later, "variant-a", "index.html"), "utf8");
  expect(htmlV1).toContain('data-od-id="product-hat"');
  expect(htmlV2).toContain('data-od-id="product-hat"');
  expect(htmlV2.indexOf("product-bag")).toBeLessThan(htmlV2.indexOf("product-hat"));
  const fragileFirstCard = /article[\s\S]*?data-od-id="([^"]+)"/.exec(htmlV2);
  expect(fragileFirstCard?.[1]).toBe("product-bag");
  expect(pin.selector).not.toContain("nth-of-type");
});

test("safe ids keep a quoted selector that querySelector can resolve", () => {
  const od = queryRoundtrip("data-od-id", "product-hat");
  expect(od.pin.selector).toBe('[data-od-id="product-hat"]');
  expect(od.pin.reviewId).toBe("product-hat");
  expect(od.found).toBe(od.node);

  const review = queryRoundtrip("data-review-id", "hero-title");
  expect(review.pin.selector).toBe('[data-review-id="hero-title"]');
  expect(review.found).toBe(review.node);
});

test("quotes, backslash, spaces and slashes are escaped so querySelector finds the node", () => {
  const values = ['say"hi', "foo\\bar", "hello world", "a/b", 'mix\\ " /'];
  for (const value of values) {
    const od = queryRoundtrip("data-od-id", value);
    expect(od.pin.reviewId).toBe(value);
    expect(od.found).toBe(od.node);
  }
  const review = queryRoundtrip("data-review-id", 'hero "title"');
  expect(review.pin.reviewId).toBe('hero "title"');
  expect(review.found).toBe(review.node);
});
