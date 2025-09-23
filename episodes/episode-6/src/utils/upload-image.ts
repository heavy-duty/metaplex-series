import { createGenericFile, Umi } from "@metaplex-foundation/umi";
import { readFile } from "fs/promises";

export async function uploadImage(
  umi: Umi,
  imagePath: string,
): Promise<string> {
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  return image;
}
