import { hasDatabase, recentTransfers } from "@/lib/db";
import { hasEtherscanKey } from "@/lib/etherscan";
import { MIN_TRANSFER_USD } from "@/lib/ingest";
import { usd } from "@/lib/fmt";
import SetupNotice from "@/components/SetupNotice";
import TransferFeed from "@/components/TransferFeed";

export const dynamic = "force-dynamic";

export default async function FlowPage() {
  if (!hasDatabase()) {
    return <SetupNotice missing={{ database: true, etherscan: !hasEtherscanKey(), noData: true }} />;
  }

  const initial = await recentTransfers({ limit: 150, whalesOnly: true });
  if (!initial.length) {
    return <SetupNotice missing={{ database: false, etherscan: !hasEtherscanKey(), noData: true }} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Live flow</h1>
        <p className="mt-1 text-[13px] text-cmc-text-secondary">
          Every stored transfer of {usd(MIN_TRANSFER_USD)} or more, newest first. Red is a whale
          sending, green is a whale receiving.
        </p>
      </div>
      <TransferFeed initial={initial} minUsd={MIN_TRANSFER_USD} />
      <p className="text-[12px] leading-relaxed text-cmc-text-muted">
        This is the ingester&rsquo;s output, not a mempool stream — it lags the chain by however long
        ago the last ingest cycle ran. Only tokens in the tracked set are walked, so a large transfer
        of an unindexed token will not appear here.
      </p>
    </div>
  );
}
