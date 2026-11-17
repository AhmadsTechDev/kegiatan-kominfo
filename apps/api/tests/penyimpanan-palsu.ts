export const berkasTersimpan = new Map<string, Uint8Array>();

export const penyimpananPalsu = {
  async put(key: string, bytes: Uint8Array) {
    berkasTersimpan.set(key, new Uint8Array(bytes));
  },
  async read(key: string) {
    const data = berkasTersimpan.get(key);
    return data ? new Blob([new Uint8Array(data)]) : null;
  },
  async delete(key: string) {
    berkasTersimpan.delete(key);
  },
};

