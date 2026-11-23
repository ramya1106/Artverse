import { useState, useEffect } from "react";
import { fetchStats, updateFollowers } from "../../api";
import formatCount from "../../utils/formatCount";
import { Spinner, Label } from "../../styles/shared";
import {
  FormWrapper,
  CurrentCountCard,
  CountLabel,
  CountValue,
  CountSub,
  FormGroup,
  NumberInput,
  UpdateButton,
  SuccessBadge,
} from "./styledComponents";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UpdateFollowers = () => {
  // currentCount is the number saved in the database
  const [currentCount, setCurrentCount] = useState(null);
  const [inputValue,   setInputValue]   = useState("");
  const [updating,     setUpdating]     = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState(null);

  // Load the saved count when the tab opens
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

    // Quick check here, the backend checks again
    if (isNaN(parsed) || parsed < 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setUpdating(true);
    setSaved(false);
    setError(null);

    try {
      const updated = await updateFollowers(parsed);

      // Show the number the backend saved
      setCurrentCount(updated.instagramFollowers);
      setInputValue("");
      setSaved(true);

      // Hide the success message after a few seconds
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
          <p>Saved to database — now showing {value}{suffix} followers.</p>
        </SuccessBadge>
      )}
    </FormWrapper>
  );
};

export default UpdateFollowers;
