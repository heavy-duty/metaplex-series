import { create as createCoreNft } from "@metaplex-foundation/mpl-core";
import {
  createGenericFile,
  generateSigner,
  Umi,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { readFile } from "fs/promises";
import path from "path";

export async function createCoreNftAction(umi: Umi) {
  // Subimos la imagen a la red de irys
  const imagePath = path.join(__dirname, "../../assets/espada_oro.png");
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  // Subimos la metadata a la red de irys
  const uri = await umi.uploader.uploadJson({
    name: "Espada de Oro (c)",
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

  // Generamos el signer que sera asociado al asset
  const assetSigner = generateSigner(umi);
  console.log(`   > Asset address: ${assetSigner.publicKey}`);

  // Create the NFT
  const createSignature = await createCoreNft(umi, {
    asset: assetSigner,
    name: "Espada de Oro (c)",
    uri,
  }).sendAndConfirm(umi);
  console.log(
    `   > Create Core NFT signature: ${
      base58.deserialize(createSignature.signature)[0]
    }`,
  );
}
