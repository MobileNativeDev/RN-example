let skipNextPrimaryAlarmsRefetchCount = 0;

export const skipNextPrimaryAlarmsRefetch = () => {
  skipNextPrimaryAlarmsRefetchCount += 1;
};

export const consumePrimaryAlarmsRefetchSkip = () => {
  if (skipNextPrimaryAlarmsRefetchCount <= 0) {
    return false;
  }

  skipNextPrimaryAlarmsRefetchCount -= 1;
  return true;
};
