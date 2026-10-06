interface ImportMetaEnv {
  /** JSON endpoint returning `{ ordersVerified, locations }` for the live counter. */
  readonly PUBLIC_STATS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
