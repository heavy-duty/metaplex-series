import { createProgrammableNft } from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  generateSigner,
  percentAmount,
  Umi,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { readFile } from "fs/promises";
import path from "path";

export async function createProgrammableNftAction(umi: Umi) {
  // Subimos la imagen a la red de irys
  const imagePath = path.join(__dirname, "../../assets/espada_oro.png");
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  // Subimos la metadata a la red de irys
  const uri = await umi.uploader.uploadJson({
    name: "Espada de Oro (p)",
    description: "Espada de oro para expertos",
    image,
    attributes: [
      {
        trait_type: "Material",
        value: "Oro",
      },
      { trait_type: "Nivel", value: "10" },
    ],
    // Animation url
    // External url
    // Properties: files and asset category
  });

  // Generamos el signer que sera asociado al mint
  const mintSigner = generateSigner(umi);
  console.log(`   > Mint address: ${mintSigner.publicKey}`);

  // Minteamos el NFT en la red de solana
  const createSignature = await createProgrammableNft(umi, {
    mint: mintSigner,
    name: "Espada de Oro (p)",
    uri,
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);
  console.log(
    `   > Create signature: ${base58.deserialize(createSignature.signature)[0]}`,
  );
}
