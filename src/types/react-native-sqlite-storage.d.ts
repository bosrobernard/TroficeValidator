declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    executeSql(
      statement: string,
      params?: any[],
    ): Promise<[ResultSet]>;
  }

  export interface ResultSet {
    rows: {
      length: number;
      item(index: number): any;
    };
  }

  export interface OpenDatabaseParams {
    name: string;
    location?: string;
  }

  const SQLite: {
    enablePromise(enable: boolean): void;
    openDatabase(
      params: OpenDatabaseParams,
    ): Promise<SQLiteDatabase>;
  };

  export default SQLite;
}
