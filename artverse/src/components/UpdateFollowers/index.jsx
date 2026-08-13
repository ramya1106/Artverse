import React, { useState, useEffect } from "react";
import { fetchStats, updateFollowers } from "../../api";
import {
  FormWrapper,
  CurrentCountCard,
  CountLabel,
  CountValue,
  CountSub,
  FormGroup,
  Label,
  NumberInput,
  UpdateButton,
  Spinner,
  SuccessBadge,
} from "./styledComponents";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Format raw number for display: 120000 → { value: "120", suffix: "K" }
const formatCount = (n) => {
  if (!n && n !== 0) return { value: "—", suffix: "" };
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(1), suffix: "M" };
  if (n >= 1_000) {
    const k = n / 1_000;
    return { value: Number.isInteger(k) ? k.toString() : k.toFixed(1), suffix: "K" };
  }
  return { value: n.toString(), suffix: "" };
};

const UpdateFollowers = () => {
  // currentCount = what's currently saved in MongoDB
  const [currentCount, setCurrentCount] = useState(null);
  const [inputValue,   setInputValue]   = useState("");
  const [updating,     setUpdating]     = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState(null);

  // ── Load the current count from the backend on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStats();
        setCurrentCount(data.instagramFollowers);
      } catch (err) {
        console.error("Failed to load follower count:", err.message);
      }
    };
    load();
  }, []);

  const handleUpdate = async () => {
    const parsed = parseInt(inputValue, 10);

    // Basic validation before sending to the backend
    if (isNaN(parsed) || parsed < 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setUpdating(true);
    setSaved(false);
    setError(null);

    try {
      // PATCH /artverse/stats/followers  with { instagramFollowers: parsed }
      const updated = await updateFollowers(parsed);

      // Update the displayed count with what the backend confirmed
      setCurrentCount(updated.instagramFollowers);
      setInputValue("");
      setSaved(true);

      // Hide the success message after 3.5 seconds
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const { value, suffix } = formatCount(currentCount);

  return (
    <FormWrapper>
      <CurrentCountCard>
        <CountLabel>Current Follower Count</CountLabel>
        <CountValue key={currentCount}>
          {value}
          {suffix && <span>{suffix}</span>}
        </CountValue>
        <CountSub>Loaded from database · Updates immediately</CountSub>
      </CurrentCountCard>

      <FormGroup>
        <Label htmlFor="follower-count">New Follower Count</Label>
        <NumberInput
          id="follower-count"
          type="number"
          placeholder="e.g. 135000"
          value={inputValue}
          onChange={(e) => {
            setSaved(false);
            setError(null);
            setInputValue(e.target.value);
          }}
          min="0"
        />
      </FormGroup>

      {error && (
        <p style={{ color: "#e74c3c", fontSize: "0.7rem", marginBottom: "1rem" }}>
          ⚠ {error}
        </p>
      )}

      <UpdateButton
        onClick={handleUpdate}
        disabled={!inputValue || updating}
      >
        {updating ? <><Spinner /> Saving…</> : "Update Count"}
      </UpdateButton>

      {saved && (
        <SuccessBadge>
          <CheckIcon />
          <p>Saved to database — now showing {formatCount(currentCount).value}{formatCount(currentCount).suffix} followers.</p>
        </SuccessBadge>
      )}
    </FormWrapper>
  );
};

export default UpdateFollowers;
