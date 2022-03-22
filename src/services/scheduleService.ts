export class ScheduleService {
    private _matches?: Match[];
    private _teamAvatars?: TeamAvatars;
    async updateSchedule(): Promise<Match[]> {
        this._matches = await (await fetch("/schedule.json")).json() as Match[];
        return this._matches;
    }

    async updateAvatars(): Promise<TeamAvatars>
    {
        this._teamAvatars = await (await fetch("/avatars.json")).json() as TeamAvatars;
        return this._teamAvatars;
    }

    getSchedule(): Match[] {
        if (this._matches) return this._matches;
        throw new Error("No matches in the schedule");
    }

    getMatchByNumber(matchNumber: number): Match {
        const match = this._matches?.find(x => x.matchNumber == matchNumber);
        if (!match) throw new Error(`Unable to find match ${matchNumber}`);
        return match;
    }
}

export type Match = {
    description: string;
    level: string | null;
    startTime: Date;
    matchNumber: number;
    field: string;
    tournamentLevel: string;
    teams: Team[];
}

export type Team = {
    teamNumber: number;
    station: 'Red1' | 'Red2' | 'Red3' | 'Blue1' | 'Blue2' | 'Blue3';
    surrogate: boolean;
}

export type TeamAvatars = {
    [id: number]: string;
}