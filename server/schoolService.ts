import { store } from "./store";

export const getClassStream = (classStreamId: string) => store.classStreams.find((stream) => stream.id === classStreamId);

export const getLearnersInClass = (classStreamId: string) => store.learners.filter((learner) => learner.classStreamId === classStreamId);
