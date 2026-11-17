import { DEFAULT_TOY_FACTORY_DATASETS } from '../data/initialData';
import {
  KrampusGameState,
  TeamId,
  ToyFactoryAssignment,
  ToyFactoryItem,
} from '../types/game';

export function buildToyFactoryAssignments(
  roster: string[],
  items: ToyFactoryItem[],
  prevAssignments?: ToyFactoryAssignment[]
): ToyFactoryAssignment[] {
  const cleanRoster = roster.map((s) => s.trim()).filter(Boolean);
  const members: string[] = [];
  for (let i = 0; i < items.length; i++) {
    if (cleanRoster.length > 0) {
      members.push(cleanRoster[i % cleanRoster.length]);
    } else {
      members.push(`สมาชิก #${i + 1}`);
    }
  }
  const shuffledItems = [...items];
  for (let i = shuffledItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
  }
  const prevByMember = new Map((prevAssignments || []).map((a) => [a.memberName, a.itemId]));
  return members.map((memberName, idx) => {
    const item = shuffledItems[idx];
    const prevId = prevByMember.get(memberName);
    return {
      memberName,
      itemId: item.id,
      label: item.label,
      realValue: item.realValue,
      isMystery: Boolean(item.isMystery),
      mysteryClue: item.mysteryClue,
      changedOnShuffle: prevAssignments ? prevId !== item.id : false,
    };
  });
}

export function applyToyDatasetSelection(
  next: KrampusGameState,
  teamId: TeamId,
  datasetId: string,
  now: number
): boolean {
  const tf = next.round.toyFactory;
  if (!tf || tf.phase !== 'TOPIC_SELECT') return false;
  const currentPair = tf.pairings[tf.roundIndex - 1];
  if (!currentPair || currentPair.sortingTeamId !== teamId) return false;
  if (tf.usedDatasetIds.includes(datasetId)) return false;

  const datasets = next.toyFactoryDatasets || DEFAULT_TOY_FACTORY_DATASETS;
  const ds = datasets.find((d) => d.id === datasetId);
  if (!ds) return false;

  const holdingTeam = next.teams[currentPair.holdingTeamId];
  const assignments = buildToyFactoryAssignments(holdingTeam?.roster || [], ds.items);

  tf.selectedDatasetId = datasetId;
  tf.usedDatasetIds = [...tf.usedDatasetIds, datasetId];
  tf.phase = 'PREP_10S';
  tf.prepEndsAt = now + 10000;
  tf.assignments = assignments;
  next.round.title = `THE TOY FACTORY CHAOS • รอบที่ ${tf.roundIndex}/${tf.pairings.length}`;
  next.round.subtitle = `${ds.title} (${ds.direction})`;
  next.round.questionText = `${ds.title} — ${ds.direction}`;
  return true;
}

export function applyToyFactoryShuffle(
  next: KrampusGameState,
  spectatorTeamId: TeamId,
  now: number
): boolean {
  const tf = next.round.toyFactory;
  if (!tf || tf.phase !== 'ACTION' || next.round.status !== 'ACTIVE') return false;
  const currentPair = tf.pairings[tf.roundIndex - 1];
  if (!currentPair) return false;
  if (
    spectatorTeamId === currentPair.sortingTeamId ||
    spectatorTeamId === currentPair.holdingTeamId
  ) {
    return false;
  }
  if (tf.shuffleUsedThisRound || tf.shuffleUsedByTeams.includes(spectatorTeamId)) {
    return false;
  }
  const elapsed = next.round.timerStartedAt ? Math.max(0, now - next.round.timerStartedAt) : 0;
  const remainingMs = Math.max(0, next.round.durationSeconds * 1000 - elapsed);
  if (remainingMs <= 15000) return false;

  const datasets = next.toyFactoryDatasets || DEFAULT_TOY_FACTORY_DATASETS;
  const ds = datasets.find((d) => d.id === tf.selectedDatasetId);
  if (!ds) return false;

  const holdingTeam = next.teams[currentPair.holdingTeamId];
  tf.assignments = buildToyFactoryAssignments(
    holdingTeam?.roster || [],
    ds.items,
    tf.assignments
  );
  tf.shuffleUsedThisRound = true;
  tf.shuffleUsedByTeams = [...tf.shuffleUsedByTeams, spectatorTeamId];
  tf.phase = 'SHUFFLE_BUFFER_10S';
  tf.bufferEndsAt = now + 10000;

  next.round.timerStartedAt = null;
  next.round.timerRemainingMs = remainingMs;
  next.round.status = 'LOCKED';
  return true;
}

export function applyToyFactoryFinalize(next: KrampusGameState): boolean {
  const tf = next.round.toyFactory;
  if (!tf) return false;
  const currentPair = tf.pairings[tf.roundIndex - 1];
  if (!currentPair) return false;
  const wrongCount = tf.revealSlots.filter((s) => s.verdict === 'WRONG').length;
  const sortingTeam = next.teams[currentPair.sortingTeamId];
  const holdingTeam = next.teams[currentPair.holdingTeamId];

  if (wrongCount === 0) {
    sortingTeam.coins += 800;
    holdingTeam.coins += 300;
  } else {
    sortingTeam.coins = Math.max(0, sortingTeam.coins - wrongCount * 100);
    holdingTeam.toyFactoryCurse = true;
  }
  next.round.status = 'REVEALED';
  next.round.rewardsApplied = true;
  return true;
}
