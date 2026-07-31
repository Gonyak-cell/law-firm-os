import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  fetchClientReceivables,
  patchClientFeeCommitment,
  reallocateClientReceivableDeposit
} from "../data/apiClient.js";
import { buildClientReceivablesModel } from "./ClientReceivablesModel.js";
import { ClientReceivablesPanel } from "./ClientReceivablesPanel.jsx";

function identifier(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stableCommandKey(cache, prefix, payload) {
  const fingerprint = JSON.stringify(payload);
  if (cache.has(fingerprint)) return cache.get(fingerprint);
  const suffix = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    ?? `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const key = `${prefix}:${suffix}`.slice(0, 128);
  cache.set(fingerprint, key);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  return key;
}

export function ClientReceivablesContainer({
  ctx = "allow",
  initialClientId = "",
  maxVisibleRows = 50,
  readReceivables = fetchClientReceivables,
  patchFeeCommitment = patchClientFeeCommitment,
  reallocateDeposit = reallocateClientReceivableDeposit
}) {
  const [receivablesState, setReceivablesState] = useState({
    routeIdentity: null,
    result: null
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [statusTab, setStatusTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedFeeCommitmentId, setSelectedFeeCommitmentId] = useState(null);
  const [selectedDepositId, setSelectedDepositId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [mutationResult, setMutationResult] = useState(null);
  const readGenerationRef = useRef(0);
  const mutationGenerationRef = useRef(0);
  const selectionGenerationRef = useRef(0);
  const commandKeysRef = useRef(new Map());
  const appliedInitialClientRef = useRef(null);
  const routeIdentity = `${ctx}:${identifier(initialClientId) ?? ""}`;
  const receivablesResult = receivablesState.routeIdentity === routeIdentity
    ? receivablesState.result
    : null;

  useLayoutEffect(() => {
    readGenerationRef.current += 1;
    selectionGenerationRef.current += 1;
    mutationGenerationRef.current += 1;
    appliedInitialClientRef.current = null;
    setPendingAction(null);
    setMutationResult(null);
    setSelectedClientId(null);
    setSelectedFeeCommitmentId(null);
    setSelectedDepositId(null);
  }, [routeIdentity]);

  useEffect(() => {
    const generation = ++readGenerationRef.current;
    let active = true;
    setReceivablesState({ routeIdentity, result: null });
    readReceivables({ ctx })
      .then((result) => {
        if (active && generation === readGenerationRef.current) {
          setReceivablesState({ routeIdentity, result });
        }
      })
      .catch(() => {
        if (active && generation === readGenerationRef.current) {
          setReceivablesState({
            routeIdentity,
            result: { kind: "error", uiState: "error" }
          });
        }
      });
    return () => {
      active = false;
    };
  }, [ctx, readReceivables, refreshToken, routeIdentity]);

  const model = useMemo(() => buildClientReceivablesModel({
    receivablesResult,
    clientsResult: receivablesResult,
    mutationResult,
    requestedFeeCommitmentId: selectedFeeCommitmentId ?? "",
    statusTab,
    searchQuery
  }), [
    mutationResult,
    receivablesResult,
    searchQuery,
    selectedFeeCommitmentId,
    statusTab
  ]);

  const clients = receivablesResult?.kind === "data"
    && Array.isArray(receivablesResult.clients)
    ? receivablesResult.clients
    : [];

  useEffect(() => {
    const requested = identifier(initialClientId);
    const key = `${ctx}:${requested ?? ""}`;
    if (receivablesResult?.kind !== "data" || appliedInitialClientRef.current === key) return;
    appliedInitialClientRef.current = key;
    setSelectedClientId(
      requested && clients.some((client) => client.client_group_id === requested)
        ? requested
        : null
    );
  }, [clients, ctx, initialClientId, receivablesResult]);

  useEffect(() => {
    if (receivablesResult?.kind !== "data") return;
    if (!selectedClientId) return;
    if (!clients.some((client) => client.client_group_id === selectedClientId)) {
      setSelectedClientId(null);
      setSelectedFeeCommitmentId(null);
      setSelectedDepositId(null);
    }
  }, [clients, receivablesResult, selectedClientId]);

  useEffect(() => {
    if (receivablesResult?.kind !== "data") return;
    if (
      selectedFeeCommitmentId
      && !model.commitments.some((row) => (
        row.feeCommitmentId === selectedFeeCommitmentId
        && row.clientGroupId === selectedClientId
      ))
    ) setSelectedFeeCommitmentId(null);
    if (
      selectedDepositId
      && !model.deposits.some((row) => (
        row.bankTransactionId === selectedDepositId
        && row.clientGroupId === selectedClientId
      ))
    ) setSelectedDepositId(null);
  }, [
    model.commitments,
    model.deposits,
    receivablesResult,
    selectedClientId,
    selectedDepositId,
    selectedFeeCommitmentId
  ]);

  function invalidateSelection() {
    selectionGenerationRef.current += 1;
    mutationGenerationRef.current += 1;
    setPendingAction(null);
    setMutationResult(null);
    setSelectedClientId(null);
    setSelectedFeeCommitmentId(null);
    setSelectedDepositId(null);
  }

  function changeClient(clientId) {
    selectionGenerationRef.current += 1;
    mutationGenerationRef.current += 1;
    setPendingAction(null);
    setMutationResult(null);
    setSelectedClientId(identifier(clientId));
    setSelectedFeeCommitmentId(null);
    setSelectedDepositId(null);
  }

  function runMutation(action, payload, invoke) {
    const generation = ++mutationGenerationRef.current;
    const selectionGeneration = selectionGenerationRef.current;
    const idempotencyKey = stableCommandKey(
      commandKeysRef.current,
      `client_ar_${action}`,
      payload
    );
    setMutationResult({ kind: "loading" });
    setPendingAction(action);
    invoke({ ...payload, ctx, idempotencyKey })
      .then((result) => {
        const completed = result?.kind === "data" && result.status === 200;
        if (completed) setRefreshToken((value) => value + 1);
        if (
          generation !== mutationGenerationRef.current
          || selectionGeneration !== selectionGenerationRef.current
        ) return;
        setPendingAction(null);
        setMutationResult(result);
      })
      .catch(() => {
        if (
          generation === mutationGenerationRef.current
          && selectionGeneration === selectionGenerationRef.current
        ) {
          setPendingAction(null);
          setMutationResult({ kind: "error", uiState: "error" });
        }
      });
  }

  return (
    <div data-client-receivables-container="true">
      <ClientReceivablesPanel
        model={model}
        clients={clients}
        selectedClientId={selectedClientId}
        selectedFeeCommitmentId={selectedFeeCommitmentId}
        selectedDepositId={selectedDepositId}
        maxVisibleRows={maxVisibleRows}
        pendingAction={pendingAction}
        mutationResult={mutationResult}
        onStatusTabChange={(nextTab) => {
          invalidateSelection();
          setStatusTab(nextTab);
        }}
        onSearchChange={(query) => {
          invalidateSelection();
          setSearchQuery(query);
        }}
        onSelectClient={changeClient}
        onSelectFeeCommitment={(feeCommitmentId) => {
          selectionGenerationRef.current += 1;
          mutationGenerationRef.current += 1;
          setPendingAction(null);
          setMutationResult(null);
          setSelectedFeeCommitmentId(identifier(feeCommitmentId));
        }}
        onSelectDeposit={(depositId) => {
          selectionGenerationRef.current += 1;
          mutationGenerationRef.current += 1;
          setPendingAction(null);
          setMutationResult(null);
          setSelectedDepositId(identifier(depositId));
        }}
        onUpdateFeeCommitment={(payload) => runMutation(
          "update",
          { ...payload, operation: "edit" },
          patchFeeCommitment
        )}
        onCancelFeeCommitment={(payload) => runMutation(
          "cancel",
          { ...payload, operation: "cancel" },
          patchFeeCommitment
        )}
        onReallocateDeposit={(payload) => runMutation(
          "reallocate",
          payload,
          reallocateDeposit
        )}
        onRefresh={() => setRefreshToken((value) => value + 1)}
      />
    </div>
  );
}

export default ClientReceivablesContainer;
