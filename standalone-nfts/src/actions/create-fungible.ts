import {
  createFungible,
  mintV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createTokenIfMissing,
  findAssociatedTokenPda,
  getSplAssociatedTokenProgramId,
} from "@metaplex-foundation/mpl-toolbox";
import {
  createGenericFile,
  generateSigner,
  percentAmount,
  Umi,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { readFile } from "fs/promises";
import path from "path";

export async function createFungibleAction(umi: Umi) {
  // Subimos la imagen a la red de irys
  const imagePath = path.join(__dirname, "../../assets/image.png");
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  // Subimos la metadata a la red de irys
  const uri = await umi.uploader.uploadJson({
    name: "Mi primer token fungible",
    symbol: "FAM",
    description: "Este es mi primer token fungible de Metaplex",
    image,
  });

  // Generamos el signer que sera asociado al mint
  const mintSigner = generateSigner(umi);
  console.log(`   > Mint address: ${mintSigner.publicKey}`);

  // Creamos el mint del token fungible en la red de Solana
  const createSignature = await createFungible(umi, {
    mint: mintSigner,
    name: "Mi fungible",
    uri,
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);
  console.log(
    `   > Create signature: ${base58.deserialize(createSignature.signature)[0]}`,
  );

  // Obtenemos la dirección de la cuenta que recibirá los tokens
  const associatedTokenPda = findAssociatedTokenPda(umi, {
    mint: mintSigner.publicKey,
    owner: umi.identity.publicKey,
  });
  console.log(`   > Receiver address: ${associatedTokenPda[0]}`);

  // Creamos la cuenta asociada al token para el receptor en la red de Solana
  const createAssociatedTokenAccountSignature = await createTokenIfMissing(
    umi,
    {
      mint: mintSigner.publicKey,
      owner: umi.identity.publicKey,
      ataProgram: getSplAssociatedTokenProgramId(umi),
    },
  ).sendAndConfirm(umi);
  console.log(
    `   > Create ATA signature: ${
      base58.deserialize(createAssociatedTokenAccountSignature.signature)[0]
    }`,
  );

  // Minteamos unos tokens a la wallet del receptor
  const mintSignature = await mintV1(umi, {
    mint: mintSigner.publicKey,
    amount: 1,
    tokenOwner: umi.identity.publicKey,
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);
  console.log(
    `   > Mint signature: ${base58.deserialize(mintSignature.signature)[0]}`,
  );
}
