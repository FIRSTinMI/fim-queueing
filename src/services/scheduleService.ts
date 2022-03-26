export class ScheduleService {
    private _matches?: Match[];
    private _teamAvatars?: TeamAvatars;

    async getCurrentMatch(): Promise<number> {
        const numberFetch = await fetch(`${process.env.PREACT_APP_BASEURL}/currentMatch.txt`);
        if (!numberFetch.ok) throw new Error("Unable to load match number");
        const matchNumber = Number.parseInt(await numberFetch.text(), 10);
        if (Number.isNaN(matchNumber)) throw new Error("Current match was not a number");

        return matchNumber;
    }

    async sendMatchNumber(matchNumber: number): Promise<void> {
        await fetch(`${process.env.PREACT_APP_BASEURL}/currentMatch.txt`, {
            method: "PUT",
            body: matchNumber.toString()
        })
    }

    async updateSchedule(): Promise<Match[]> {
        const scheduleFetch = await fetch(`${process.env.PREACT_APP_BASEURL}/schedule.json`);
        if (!scheduleFetch.ok) throw new Error("Unable to load matches");
        this._matches = await scheduleFetch.json() as Match[];
        return this._matches;
    }

    async updateAvatars(): Promise<TeamAvatars>
    {
        const avatarFetch = await fetch(`${process.env.PREACT_APP_BASEURL}/avatars.json`);
        if (!avatarFetch.ok) throw new Error("Unable to load avatars");
        this._teamAvatars = await avatarFetch.json() as TeamAvatars;
        return this._teamAvatars;
    }

    getSchedule(): Match[] {
        if (this._matches) return this._matches;
        throw new Error("No matches in the schedule");
    }

    getMatchByNumber(matchNumber: number): Match | null {
        const match = this._matches?.find(x => x.matchNumber == matchNumber);
        if (!match) {
            console.warn(`Unable to find match ${matchNumber}`);
            return null;
        }

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